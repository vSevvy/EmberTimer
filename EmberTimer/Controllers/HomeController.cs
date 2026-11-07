using Microsoft.AspNetCore.Mvc;

namespace EmberTimer.Controllers;

public sealed class HomeController : Controller
{
    public IActionResult Index() => View();

    public IActionResult Error() => View();
}
